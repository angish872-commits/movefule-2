package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO013ExportDataScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_013",
        title = "Export Data",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_012,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Preparing export","Collecting account data","Packaging files","Ready"),1)
            MFNotice("Private export","The resulting archive should be treated as personal data.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO013ExportDataScreenPreview() {
    MoveFuelTheme { PRO013ExportDataScreen {} }
}
