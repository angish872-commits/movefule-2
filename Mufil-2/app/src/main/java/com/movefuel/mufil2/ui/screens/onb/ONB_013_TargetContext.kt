package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB013TargetContextScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_013",
        title = "Target Context",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_012,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Performance-focused", "No weight-change target required.", true)
            MFOptionCard("Eligible adult target", "Shown only where product policy allows.")
            MFNotice("Youth-safe behavior", "Under-18 users do not receive automatic restrictive weight-change targets.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB013TargetContextScreenPreview() {
    MoveFuelTheme { ONB013TargetContextScreen {} }
}
