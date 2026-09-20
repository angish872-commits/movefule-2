package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG016PersonalRecordsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_016",
        title = "Personal Records",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_015,
        onNavigate = onNavigate,
    ) {
            MFListItem("Bench Press","75 kg · Sep 14","PR")
            MFListItem("5K Run","25:42 · Sep 4","PR")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG016PersonalRecordsScreenPreview() {
    MoveFuelTheme { PRG016PersonalRecordsScreen {} }
}
