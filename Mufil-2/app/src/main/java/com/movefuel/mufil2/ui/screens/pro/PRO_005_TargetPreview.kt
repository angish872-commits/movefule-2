package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute
import com.movefuel.mufil2.ui.state.CanonicalAppState
import com.movefuel.mufil2.ui.state.toTargetPreviewUiState

@Composable
fun PRO005TargetPreviewScreen(
    onNavigate: (MoveFuelRoute) -> Unit,
    state: CanonicalAppState = CanonicalAppState(),
) {
    val preview = state.toTargetPreviewUiState()
    MFScreenFrame(
        id = "PRO_005",
        title = "Target Preview",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_004,
        onNavigate = onNavigate,
    ) {
        MFStatusBanner("Preview future change", "Historical days remain unchanged.")
        MFSectionTitle(preview.headline)
        preview.rows.forEach { row ->
            MFListItem(row.label, row.value, row.detail)
        }
        if (preview.notes.isNotEmpty()) {
            MFSectionTitle("Review notes")
            preview.notes.forEach { note ->
                MFNotice("Review", note)
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO005TargetPreviewScreenPreview() {
    MoveFuelTheme {
        PRO005TargetPreviewScreen(
            onNavigate = {},
            state = CanonicalAppState(
                targetDateOfBirth = "1996-08-07",
                targetHeight = "175",
                targetWeight = "75",
                targetSexForEnergyEstimation = "Male",
                targetActivityLevel = "Moderate",
                targetTrainingFrequency = "4 days",
                targetGoal = "Gain muscle",
            ),
        )
    }
}
